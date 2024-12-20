export interface Receta{
    id: number;
    nombre: string;
    categoria: string;
    cocinero: string;
    dificultad: string;
    ingredientes: string[];
    utensilios: string[];
    tiempoPreparacion: number;
    tiempoHorno: number;
    temperatura: number;
    numPasos: string[];
    imagen: string;
    raciones: number;
}
