async function main() {
  const email = "superadmin@yopmail.com";
  
  console.log("1. Requesting forgot password token...");
  const forgotResponse = await fetch("http://localhost:4001/api/v1/admin/forget-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  
  const forgotJson = await forgotResponse.json();
  console.log("Forgot Password Response:", forgotJson);
  
  if (!forgotJson.success || !forgotJson.data || !forgotJson.data.token) {
    console.error("Failed to get token");
    return;
  }
  
  const token = forgotJson.data.token;
  console.log("Retrieved Reset Token:", token);
  
  console.log("2. Resetting password using token...");
  const resetResponse = await fetch("http://localhost:4001/api/v1/admin/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      password: "Developer123#"
    })
  });
  
  const resetJson = await resetResponse.json();
  console.log("Reset Password Response:", resetJson);

  // verify login with new password
  console.log("3. Verifying login with new password Developer123#...");
  const loginResponse = await fetch("http://localhost:4001/api/v1/admin/admin-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: "Developer123#"
    })
  });
  const loginJson = await loginResponse.json();
  console.log("Login with new password response:", loginJson);

  if (loginJson.success && loginJson.data && loginJson.data.token) {
    const adminToken = loginJson.data.token;
    console.log("4. Restoring original password Juhi@2503#$...");
    const changePwdResponse = await fetch("http://localhost:4001/api/v1/admin/change-password", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        oldPassword: "Developer123#",
        newPassword: "Juhi@2503#$"
      })
    });
    const changePwdJson = await changePwdResponse.json();
    console.log("Change Password back response:", changePwdJson);
  }
}

main().catch(console.error);
