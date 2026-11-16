import { Component, ElementRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import * as d3 from 'd3';

@Component({
  selector: 'app-grafica',
  templateUrl: './grafica.component.html',
  styleUrls: ['./grafica.component.css']
})
export class GraficaComponent implements OnChanges {

  @Input() data: { country: string, visits: number }[] = [];
  @Input() tipoGrafico: string = '';

  constructor(private elementRef: ElementRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] || changes['tipoGrafico']) {
      this.createChart();
    }
  }

  createChart(): void {
    if (this.tipoGrafico === 'barras') {
      this.createChartBarras();
    }
  }

  createChartBarras(): void {
    d3.select("#chart").selectAll("*").remove();

    if (!this.data || this.data.length === 0) return;

    const margin = { top: 40, right: 30, bottom: 90, left: 60 };
    const width = 650 - margin.left - margin.right;
    const height = 320 - margin.top - margin.bottom;

    const svg = d3.select("#chart")
      .attr("width", "100%")
      .attr("height", height + margin.top + margin.bottom)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Definir un degradado SVG moderno para las barras
    const defs = svg.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "bar-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");

    gradient.append("stop").attr("offset", "0%").attr("stop-color", "#fbbf24"); // Ámbar claro
    gradient.append("stop").attr("offset", "100%").attr("stop-color", "#d97706"); // Naranja intenso

    const x = d3.scaleBand()
      .range([0, width])
      .domain(this.data.map(d => d.country))
      .padding(0.25);

    const maxVal = d3.max(this.data, d => d.visits) || 1;
    const y = d3.scaleLinear()
      .range([height, 0])
      .domain([0, maxVal]);

    // Eje Y con estilo limpio
    svg.append("g")
      .attr("class", "y axis")
      .call(d3.axisLeft(y).ticks(5).tickSize(-width))
      .style("stroke-dasharray", "3,3")
      .style("opacity", "0.4");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left + 15)
      .attr("x", 0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("fill", "#64748b")
      .style("font-weight", "600")
      .text("Visitas");

    // Barras con el degradado aplicado
    svg.selectAll(".bar")
      .data(this.data)
      .enter().append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.country)!)
      .attr("width", x.bandwidth())
      .attr("y", d => y(d.visits))
      .attr("height", d => height - y(d.visits))
      .attr("rx", 8) // Esquinas superiores redondeadas
      .attr("ry", 8)
      .style("fill", "url(#bar-gradient)")
      .style("transition", "all 0.3s ease");

    // Etiquetas de los países en el eje X
    svg.selectAll(".label")
      .data(this.data)
      .enter().append("text")
      .attr("class", "label")
      .attr("x", d => x(d.country)! + x.bandwidth() / 2)
      .attr("y", height + 12)
      .attr("dy", "0.75em")
      .style("text-anchor", "end")
      .style("font-size", "11px")
      .style("font-weight", "600")
      .style("fill", "#334155")
      .attr("transform", d => `rotate(-30, ${x(d.country)! + x.bandwidth() / 2}, ${height + 12})`)
      .text(d => d.country);
  }
}
