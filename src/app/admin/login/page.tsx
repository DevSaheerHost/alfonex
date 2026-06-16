import { redirect } from 'next/navigation';

// /admin/login is not used — the login form lives inside the admin HTML itself.
export default function AdminLoginRedirect() {
  redirect('/admin');
}
