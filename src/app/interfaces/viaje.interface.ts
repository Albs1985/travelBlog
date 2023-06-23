export interface Viaje{
    fechaInicio: Date;
    fechaFin: Date;
    destino: string;
    categoria: string;
    provincia: string;
    pais: string;
    dias: number;
    numFotos: number;
    precio: number;
    estancia: string;
    tipoEstancia: string;
    transporte: string[];
    personas: string[];    
    mapaSrc: string[];    
}