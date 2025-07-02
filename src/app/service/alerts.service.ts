import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  constructor() {}

  async confirmDialog(options: {
    title: string;
    text: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
  }): Promise<boolean> {
    const result = await Swal.fire({
      title: options.title,
      text: options.text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: options.confirmButtonText || 'Yes',
      cancelButtonText: options.cancelButtonText || 'No',
      customClass: { popup: 'sweet-alerts' },
    });
    return result.isConfirmed;
  }

  sweetAlertIt(message: string, title = 'Success', icon: any = 'success') {
    Swal.fire({
      icon: icon,
      title,
      text: message,
      confirmButtonText: 'OK',
      padding: '2em',
      customClass: { popup: 'sweet-alerts' },
    });
  }

  showMessage(msg = '', type = 'success', position: any = 'top') {
    const toast: any = Swal.mixin({
      toast: true,
      position: position,
      showConfirmButton: false,
      timer: 3000,
      customClass: { container: 'toast' },
    });
    toast.fire({
        icon: type,
        title: msg,
        padding: '10px 20px',
    });
  }
}
