import { Component } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-contact-qr',
  templateUrl: './contact-qr.component.html',
  styleUrls: ['./contact-qr.component.css']
})
export class ContactQRComponent {

  nom : any = '';
  mail : any = '';
  mensajeCorreo : any = '';
  asuntoES : string = 'Blog de viajes Familia Serrador Casares';
  asuntoVAL : string = 'Blog de viatges Familia Serrador Casares';
  correo : string = '';
  controlNombre = new FormControl(null, [Validators.required, Validators.pattern(/[\S]/), Validators.maxLength(80)]);
  controlEmail = new FormControl(null, [Validators.required, Validators.email, Validators.pattern(/[\S]/)]);
  controlMensaje = new FormControl(null, [Validators.required, Validators.pattern(/[\S]/)]);

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
    }else if (this.translate.currentLang == 'val'){
      this.correo = this.correo + this.asuntoVAL;
    }
    if (this.mensajeCorreo != null && this.mensajeCorreo != ''){
      this.correo = this.correo +'&body='+this.mensajeCorreo;
    }
    if (this.nom != null && this.nom != ''){
      if (this.translate.currentLang == 'es'){
        this.correo = this.correo +'%0D%0AFirmado: '+ this.nom;
      }else if (this.translate.currentLang == 'val'){
        this.correo = this.correo +'%0D%0AFirmat: '+ this.nom;
      }
    }
    if (this.mail != null && this.mail != ''){
      this.correo = this.correo + '&cc='+ this.mail;
    }

    // this.limpiaForm();

    // console.log(this.correo);

  }

  // limpiaForm(){
  //   this.controlNombre.reset();
  //   this.controlEmail.reset();
  //   this.controlMensaje.reset();
  // }

}
