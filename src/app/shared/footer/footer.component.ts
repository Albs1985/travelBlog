import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Viaje } from '../../interfaces/viaje.interface';
import { CommonService } from 'src/app/services/common.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {

  // private audio: HTMLAudioElement;
  anyo : number = new Date().getFullYear();

  // audioUrl!: SafeResourceUrl;
  // isPlaying: boolean = false;
  // audioElement!: HTMLAudioElement;


  constructor(/*private sanitizer: DomSanitizer*/public commonService: CommonService) {

  }


  ngOnInit(): void {
    // console.log('ngOnInit +audioMar.mp3');
    // const audioSrc = '/assets/audios/audioMar.mp3';
    // this.audioUrl = this.sanitizer.bypassSecurityTrustResourceUrl(audioSrc);
    // this.audioElement = new Audio(audioSrc);
    // // console.log(this.audioElement);
    // this.audioElement.addEventListener('ended', () => {
    //   this.isPlaying = false;
    // });
  }

  // playAudio(): void {
  //   // console.log('playAudio ');
  //   this.audioElement.play();
  //   this.isPlaying = true;
  // }

  // pauseAudio(): void {
  //   // console.log('playAudio ');
  //   this.audioElement.pause();
  //   this.isPlaying = false;
  // }

  // @ViewChild('audioPlayer') audioPlayerRef!: ElementRef<HTMLAudioElement>;
  // audioMar: HTMLAudioElement;


  // constructor(private sanitizer: DomSanitizer) {
  //   this.audioMar = new Audio('/assets/audios/audioMar.mp3');
  //   //No deja hacerlo aquí, tenemos que hacerlo en el afterViewInit, para que pille el cambio del volumen por defecto
  //   // this.audioMar.volume = 0.2;
  //   // this.audioMar.play();
  // }

  // ngAfterViewInit() {
  //   const audioPlayer = this.audioPlayerRef.nativeElement;
  //   audioPlayer.oncanplaythrough = () => {
  //     audioPlayer.volume = 0.2; // Establecer el volumen deseado
  //   };
  // }

}
