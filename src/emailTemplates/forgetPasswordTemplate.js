module.exports.ForgetPasswordTemplate = (name, forgetPasswordLink) => {
  return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f4f4f4;
                  text-align: center;
                  padding: 40px;
              }
              .container {
                  background: #fff;
                  padding: 20px;
                  border-radius: 8px;
                  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
                  max-width: 500px;
                  margin: auto;
              }
              .btn {
                  display: inline-block;
                  padding: 10px 20px;
                  font-size: 16px;
                  color: #fff;
                  background-color: #007bff;
                  text-decoration: none;
                  border-radius: 5px;
                  margin-top: 20px;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h2>Hello, ${name}</h2>
              <p>You requested to reset your password. Click the button below to proceed.</p>
              <a class="btn" href="${forgetPasswordLink}" target="_blank">Reset Password</a>
              <p>If you didn’t request this, please ignore this email.</p>
          </div>
      </body>
      </html>
    `;
};
