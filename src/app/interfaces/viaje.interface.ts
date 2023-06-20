export interface Viaje{
    fechaInicio: Date;
    fechaFin: Date;
    destino: string;
    provincia: string;
    pais: string;
    dias: number;
    estancia: string;
    tipoEstancia: string;
    transporte: string[];
    personas: string[];    
}