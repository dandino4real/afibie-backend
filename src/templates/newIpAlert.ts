import { wrapEmailContent } from "./wrapper";

export const newLocationAlertTemplate = (name: string, oldLocation: string, newLocation: string, ip: string) =>
  wrapEmailContent(`
    <h2>Unusual Login Location</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>We noticed a login from a new location:</p>
    <ul>
      <li><strong>Previous Location:</strong> ${oldLocation}</li>
      <li><strong>Current Location:</strong> ${newLocation}</li>
      <li><strong>IP Address:</strong> ${ip}</li>
    </ul>
    <p>If this was not you, we recommend you change your password immediately.</p>
  `);
