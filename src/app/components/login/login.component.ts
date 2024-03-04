import { Component } from '@angular/core';
import { AutenticationService } from 'src/app/services/autentication.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  password: string = '';
  clicado : boolean = false;
  hidePassword: boolean = true;

  constructor(public authenticationService: AutenticationService) { }

  login() {
    this.clicado = true;
    if (this.authenticationService.login(this.password)) {
      // Redirigir al usuario a la página protegida
      // Puedes usar Angular Router para esto
    }
    // else {
    //   alert('Contraseña incorrecta');
    // }
  }

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }
}
