export const wrapEmailContent = (content: string): string => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Email</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f6f8;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      background-color: #fff;
      margin: 40px auto;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header {
      padding: 20px;
      background-color: #00c853;
      color: #fff;
      font-size: 20px;
    }
    .content {
      padding: 20px;
      color: #333;
    }
    .footer {
      padding: 20px;
      font-size: 14px;
      color: #777;
      background-color: #f4f6f8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">Afibie Admin Notification</div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} Afibie. All rights reserved.
    </div>
  </div>
</body>
</html>
`;
