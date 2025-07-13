import { wrapEmailContent } from "./wrapper";

export const loginNotificationTemplate = (name: string, location: string, ip: string) =>
  wrapEmailContent(`
    <h2>New Login Detected</h2>
    <p>Hello <strong>${name}</strong>,</p>
    <p>Your admin account just logged in from:</p>
    <ul>
      <li><strong>Location:</strong> ${location}</li>
      <li><strong>IP:</strong> ${ip}</li>
    </ul>
    <p>If this wasn’t you, please secure your account immediately.</p>
  `);
