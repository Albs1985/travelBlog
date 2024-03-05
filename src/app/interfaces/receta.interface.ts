export interface Receta{
    id: number;
    nombre: string;
    categoria: string;
    dificultad: string;
    frase: string;
    ingredientes: string[];
    utensilios: string[];
    tiempoPreparacion: number;
    tiempoHorno: number;
    temperatura: number;
    numPasos: string[];
    imagen: string;
    porciones: number;
}
