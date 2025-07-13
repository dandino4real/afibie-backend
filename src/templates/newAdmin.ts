import { wrapEmailContent } from "./wrapper";

export const newAdminTemplate = (name: string, email: string, password: string) => 
  wrapEmailContent(`
    <h2>Welcome to Afibie!</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Your admin account has been created. Here are your login credentials:</p>
    <ul>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Password:</strong> ${password}</li>
    </ul>
    <p><strong>Please log in and change your password immediately.</strong></p>
  `);
