import { AfterViewInit, Component, ElementRef, ViewChild, OnInit } from '@angular/core';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements AfterViewInit, OnInit{

  // private audio: HTMLAudioElement;
  anyo : number = new Date().getFullYear();

  // @ViewChild('audioPlayer') audioPlayerRef!: ElementRef<HTMLAudioElement>;
  audioMar: HTMLAudioElement;
  

  constructor() {
    this.audioMar = new Audio();  
    //No deja hacerlo aquí, tenemos que hacerlo en el afterViewInit, para que pille el cambio del volumen por defecto
    // this.audioMar.volume = 0.2;
    // this.audioMar.play();    
  }

  ngAfterViewInit() {
    // const audioPlayer = this.audioPlayerRef.nativeElement;
    // audioPlayer.oncanplaythrough = () => {
    //   audioPlayer.volume = 0.2; // Establecer el volumen deseado
    // };
  }

  playAudio(): void {
    this.audioMar.src = '/assets/audios/audioMar.mp3';
    this.audioMar.load();
    this.audioMar.play();    
    this.audioMar.loop = true;
  }

  ngOnInit(): void {
    this.playAudio();
  }

}
