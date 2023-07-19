import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
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

  envia() {
    // console.log('Envia correo');
    if($('#nombreTxt').val() == ''){
      this.nom = '';
    } else {
      this.nom = $('#nombreTxt').val();
      this.nom = this.nom.replace('!', '');
    }

    if($('#emailTxt').val() == ''){
      this.mail = '';
    } else {
      this.mail = $('#emailTxt').val();
      this.mail = this.mail.replace('!', '');
    }
    
    if($('#mensajeTxt').val() == ''){
      this.mensajeCorreo = '';
    } else {
      this.mensajeCorreo = $('#mensajeTxt').val();
      this.mensajeCorreo = this.mensajeCorreo.replace('!', '');;
    }

    // console.log(this.translate.currentLang);
    //Construimos el mensaje    
    this.correo = 'albertserrador@gmail.com?subject=';
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
      this.correo = this.correo + ': '+ this.mail;
    }

    // console.log('nom: '+this.nom);
    // console.log('mail: '+this.mail);
    // console.log('mensajeCorreo: '+this.mensajeCorreo);
    // console.log(this.correo);

  }


}
