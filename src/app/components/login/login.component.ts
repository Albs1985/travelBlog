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
    this.authenticationService.login(this.password);
  }

  loginRelatoIaia() {
    this.clicado = true;
    this.authenticationService.loginRelatoIaia(this.password);
  }

  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }
}
