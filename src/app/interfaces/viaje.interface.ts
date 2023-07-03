export interface Viaje{
    fechaInicio: Date;
    fechaFin: Date;
    destino: string;
    categoria: string;
    provincia: string;
    pais: string;
    year: number;
    idAnteriorViaje: string;
    idSiguienteViaje: string;
    diaInicio : number,    
    mesInicio : number;
    diaFin : number,
    mesFin : number;
    numFotos: number;
    identificadorFotos: string;
    precio: number;
    estancia: string;
    tipoEstancia: string;
    transporte: string[];
    personas: string[];    
    mapaSrc: string[];    
}