import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-contact-qr',
  templateUrl: './contact-qr.component.html',
  styleUrls: ['./contact-qr.component.css']
})
export class ContactQRComponent {

  // contactForm: FormGroup;
  nom : any = '';
  mail : any = '';
  mensajeCorreo : any = '';
  asuntoES : string = 'Hola, me interesa tu blog de viajes';
  asuntoVAL : string = 'Hola, m\'interesa el teu blog de viatges';
  correo : string = '';

  constructor(private translate: TranslateService) {    
  }

  calculaCorreo() {
    // console.log('calculaCorreo ');
    if($('#nombreTxt').val() == ''){
      this.nom = '';
    } else {
      this.nom = $('#nombreTxt').val();
    }

    if($('#emailTxt').val() == ''){
      this.mail = '';
    } else {
      this.mail = $('#emailTxt').val();
    }
    
    if($('#mensajeTxt').val() == ''){
      this.mensajeCorreo = '';
    } else {
      this.mensajeCorreo = $('#mensajeTxt').val();
    }

    //Construimos el mensaje    
    this.correo = 'mailto:albertserrador@gmail.com?subject=';
    if (this.translate.currentLang == 'es'){
      this.correo = this.correo + this.asuntoES;
    }else{
      this.correo = this.correo + this.asuntoVAL;
    }        
    if (this.mensajeCorreo != null && this.mensajeCorreo != ''){
      this.correo = this.correo +'&body='+this.mensajeCorreo;
    }
    if (this.nom != null && this.nom != ''){
      this.correo = this.correo +'%0D%0A'+ this.nom;
    }
    if (this.mail != null && this.mail != ''){
      this.correo = this.correo + '&cc='+ this.mail;
    }

    console.log(this.correo);
    
  }

}
