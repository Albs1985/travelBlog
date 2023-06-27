export interface Viaje{
    fechaInicio: Date;
    fechaFin: Date;
    destino: string;
    categoria: string;
    provincia: string;
    pais: string;
    year: number;
    numFotos: number;
    fotoPrincipal: string;
    precio: number;
    estancia: string;
    tipoEstancia: string;
    transporte: string[];
    personas: string[];    
    mapaSrc: string[];    
}