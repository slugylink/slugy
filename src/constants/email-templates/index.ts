export const templates = {
  "login-link": (params: { url: string }) => `
  <!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sign in to Slugy</title>

    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #ffffff;
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          "Helvetica Neue", Arial, sans-serif;
      }

      .wrapper {
        background-color: #ffffff;
      }

      .outer-td {
        padding: 40px 24px;
      }

      .container {
        max-width: 480px;
        margin: 0 auto;
      }

      .logo {
        display: block;
        margin: 0 0;
        border-radius: 10px;
        margin-bottom: 24px;
      }

      .text-primary {
        font-size: 15px;
        color: #404040;
        line-height: 1.7;
        margin: 0;
      }

      .text-primary-space {
        font-size: 15px;
        color: #404040;
        line-height: 1.7;
        margin: 0 0 28px;
      }

      .text-small {
        font-size: 13px;
        color: #a3a3a3;
        line-height: 1.6;
        margin: 0;
      }

      .text-small-space {
        font-size: 13px;
        color: #a3a3a3;
        line-height: 1.6;
        margin: 0 0 24px;
      }

      .text-small-muted {
        font-size: 13px;
        color: #737373;
        line-height: 1.6;
        margin: 0 0 28px;
        word-break: break-all;
      }

      .strong-muted {
        color: #737373;
      }

      .button {
        display: inline-block;
        padding: 10px 24px;
        background-color: #0a0a0a;
        color: #ffffff;
        text-decoration: none;
        font-size: 14px;
        font-weight: 600;
        border-radius: 8px;
        line-height: 1.5;
      }

      .divider {
        border: none;
        border-top: 1px solid #e5e5e5;
        margin: 0;
      }

      .footer-link {
        color: #a3a3a3;
        text-decoration: underline;
      }

      .pb-20 {
        margin: 0 0 20px;
      }
      .pb-28 {
        padding-bottom: 28px;
      }
      .py-32 {
        padding: 32px 0;
      }
    </style>
  </head>

  <body>
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      class="wrapper"
    >
      <tr>
        <td align="center" class="outer-td">
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            class="container"
          >
            <!-- Logo -->
            <tr>
              <td align="start" style="padding-bottom: 32px">
                <img
                  src="https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://slugy.co&size=64"
                  width="38"
                  height="38"
                  alt="Slugy logo"
                  class="logo"
                />
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td>
                <p class="text-primary pb-20">Hi there,</p>
                <p class="text-primary-space">
                  You requested a magic link to sign in to your slugy account.
                  Click the button below to log in — no password needed.
                </p>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td class="pb-28">
                <a
                  href="${params.url}"
                  class="button"
                >
                  Sign in to slugy
                </a>
              </td>
            </tr>

            <!-- Info -->
            <tr>
              <td>
                <p class="text-small-space">
                  This link expires in
                  <strong class="strong-muted">15 minutes</strong>
                  and can only be used once.
                </p>
              </td>
            </tr>

            <!-- Fallback -->
            <tr>
              <td>
                <p class="text-small" style="margin-bottom: 12px">
                  Or copy and paste this URL into your browser:
                </p>
                <p class="text-small-muted">
                  ${params.url}
                </p>
                <p class="text-primary">
                  If you didn't request this, you can safely ignore this email.
                </p>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td class="py-32">
                <hr class="divider" />
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td>
                <p class="text-small">
                  This is an automated message from
                  <a href="#" class="footer-link">slugy</a>. If you need help,
                  reply to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>

  `,

  "reset-password": (params: {
    email: string;
    resetUrl: string;
    token: string;
  }) => `
        <!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    .wrapper {
      background-color: #ffffff;
    }

    .outer-td {
      padding: 40px 24px;
    }

    .container {
      max-width: 480px;
      margin: 0 auto;
    }

    .logo {
      display: block;
      margin: 0 0;
      border-radius: 10px;
    }

    .text-primary {
      font-size: 15px;
      color: #404040;
      line-height: 1.7;
      margin: 0;
    }

    .text-primary-space {
      font-size: 15px;
      color: #404040;
      line-height: 1.7;
      margin: 0 0 28px;
    }

    .text-small {
      font-size: 13px;
      color: #a3a3a3;
      line-height: 1.6;
      margin: 0;
    }

    .text-small-muted {
      font-size: 13px;
      color: #737373;
      line-height: 1.6;
      margin: 0 0 28px;
      word-break: break-all;
    }

    .strong-dark {
      color: #0a0a0a;
      font-weight: 600;
    }

    .button {
      display: inline-block;
      padding: 10px 24px;
      background-color: #0a0a0a;
      color: #ffffff;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      line-height: 1.5;
    }

    .divider {
      border: none;
      border-top: 1px solid #e5e5e5;
      margin: 0;
    }

    .footer-link {
      color: #a3a3a3;
      text-decoration: underline;
    }

    .pb-28 {
      padding-bottom: 28px;
    }

    .py-32 {
      padding: 32px 0;
    }

    .mb-20 {
      margin: 0 0 20px;
    }

    .mb-12 {
      margin: 0 0 12px;
    }
  </style>
</head>

<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="wrapper">
    <tr>
      <td align="center" class="outer-td">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="container">

          <!-- Logo -->
           <tr>
            <td align="start" style="padding-bottom:32px;">
              <img src="https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://slugy.co&size=64" width="38"
                height="38" alt="Slugy logo" class="logo" />

            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td>
              <p class="text-primary mb-20">
                You recently requested to reset the password for your slugy account associated with
                <strong class="strong-dark" style="color: #0a0a0a;">${params.email}</strong>.
              </p>

              <p class="text-primary-space">
                Click the button below to reset it.
                This link is valid for <strong class="strong-dark">60 minutes</strong>.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td class="pb-28">
              <a href="${params.resetUrl}" style="color: #ffffff;" class="button">
                Reset password
              </a>
            </td>
          </tr>

          <!-- Fallback -->
          <tr>
            <td>
              <p class="text-small mb-12">
                Or copy and paste this URL into your browser:
              </p>

              <p style="color: #0a0a0a;" class="text-small-muted">
                ${params.resetUrl}
              </p>

              <p class="text-primary">
                If you didn't make this request, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td class="py-32">
              <hr class="divider" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td>
              <p class="text-small">
                This is an automated message from
                <a href="#" class="footer-link">slugy</a>.
                If you need help, reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>

</html>
    `,

  verification: (params: {
    verificationUrl: string;
    token: string;
  }) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>

  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    .wrapper {
      background-color: #ffffff;
    }

    .outer-td {
      padding: 40px 24px;
    }

    .container {
      max-width: 480px;
      margin: 0 auto;
    }

    .logo {
      display: block;
      margin: 0 0;
      border-radius: 10px;
    }

    .text-primary {
      font-size: 15px;
      color: #404040;
      line-height: 1.7;
      margin: 0;
    }

    .text-primary-space {
      font-size: 15px;
      color: #404040;
      line-height: 1.7;
      margin: 0 0 28px;
    }

    .text-small {
      font-size: 13px;
      color: #a3a3a3;
      line-height: 1.6;
      margin: 0;
    }

    .text-small-space {
      font-size: 13px;
      color: #a3a3a3;
      line-height: 1.6;
      margin: 0 0 24px;
    }

    .text-small-muted {
      font-size: 13px;
      color: #737373;
      line-height: 1.6;
      margin: 0 0 28px;
      word-break: break-all;
    }

    .strong-muted {
      color: #737373;
    }

    .button {
      display: inline-block;
      padding: 10px 24px;
      background-color: #0a0a0a;
      color: #ffffff;
      text-decoration: none;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      line-height: 1.5;
    }

    .divider {
      border: none;
      border-top: 1px solid #e5e5e5;
      margin: 0;
    }

    .footer-link {
      color: #a3a3a3;
      text-decoration: underline;
    }

    .pb-28 { padding-bottom: 28px; }
    .py-32 { padding: 32px 0; }
    .mb-20 { margin: 0 0 20px; }
    .mb-12 { margin: 0 0 12px; }
  </style>
</head>

<body>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="wrapper">
    <tr>
      <td align="center" class="outer-td">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="container">

          <!-- Logo -->
           <tr>
            <td align="start" style="padding-bottom:32px;">
              <img src="https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://slugy.co&size=64" width="38"
                height="38" alt="Slugy logo" class="logo" />

            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td>
              <p class="text-primary mb-20">Hi there,</p>

              <p class="text-primary-space">
                Thanks for signing up for slugy.
                Please verify your email address to activate your account
                and start using all features.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td class="pb-28">
              <a href="${params.verificationUrl}" class="button">
                Verify email address
              </a>
            </td>
          </tr>

          <!-- Info -->
          <tr>
            <td>
              <p class="text-small-space">
                This link expires in
                <strong class="strong-muted">24 hours</strong>.
              </p>
            </td>
          </tr>

          <!-- Fallback -->
          <tr>
            <td>
              <p class="text-small mb-12">
                Or copy and paste this URL into your browser:
              </p>

              <p class="text-small-muted">
                ${params.verificationUrl}
              </p>

              <p class="text-primary">
                If you did not create a slugy account,
                you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td class="py-32">
              <hr class="divider" />
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td>
              <p class="text-small">
                This is an automated message from
                <a href="#" class="footer-link">slugy</a>.
                If you need help, reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`,

  welcome: (params: { name: string; dashboardUrl: string }) => `
    <!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Welcome to slugy</title>

    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #ffffff;
        font-family:
          -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          "Helvetica Neue", Arial, sans-serif;
      }

      .wrapper {
        background-color: #ffffff;
      }

      .outer-td {
        padding: 40px 24px;
      }

      .container {
        max-width: 480px;
        margin: 0 auto;
      }

      .logo {
        display: block;
        margin: 0;
        border-radius: 10px;
      }

      .h1 {
        margin: 0;
        font-size: 22px;
        font-weight: 600;
        color: #0a0a0a;
        line-height: 1.3;
      }

      .h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #0a0a0a;
        line-height: 1.4;
      }

      .p {
        margin: 0;
        font-size: 15px;
        color: #525252;
        line-height: 1.7;
      }

      .p-space {
        margin: 0 0 12px;
        font-size: 15px;
        color: #525252;
        line-height: 1.7;
      }

      .divider {
        border: none;
        border-top: 1px solid #e5e5e5;
        margin: 0;
      }

      .link {
        color: #0a0a0a;
        font-weight: 600;
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .button {
        display: inline-block;
        background-color: #0a0a0a;
        color: #ffffff;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        padding: 12px 24px;
        border-radius: 8px;
        line-height: 1;
      }

      .footer-text {
        margin: 0;
        font-size: 13px;
        color: #a3a3a3;
        line-height: 1.6;
      }

      .text-small {
        font-size: 13px;
        color: #a3a3a3;
        line-height: 1.6;
        margin: 0;
      }

      .footer-link {
        color: #a3a3a3;
        text-decoration: underline;
      }

      .pb-16 {
        padding-bottom: 16px;
      }
      .pb-20 {
        padding-bottom: 20px;
      }
      .pb-24 {
        padding-bottom: 24px;
      }
      .pb-28 {
        padding-bottom: 28px;
      }
      .pb-32 {
        padding-bottom: 32px;
      }
    </style>
  </head>

  <body>
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      class="wrapper"
    >
      <tr>
        <td align="center" class="outer-td">
          <table
            role="presentation"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            class="container"
          >
            <!-- Logo -->
            <tr>
              <td align="start" style="padding-bottom: 32px">
                <img
                  src="https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://slugy.co&size=64"
                  width="38"
                  height="38"
                  alt="Slugy logo"
                  class="logo"
                />
              </td>
            </tr>

            <!-- Heading -->
            <tr>
              <td class="pb-16">
                <h1 class="h1">Welcome ${params.name}!</h1>
              </td>
            </tr>

            <!-- Intro -->
            <tr>
              <td class="pb-28">
                <p class="p">
                  Thank you for signing up for slugy! You can now start creating
                  short links, track analytics, and explore bio links.
                </p>
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td class="pb-28">
                <hr class="divider" />
              </td>
            </tr>

            <!-- Getting Started -->
            <tr>
              <td class="pb-24">
                <h2 class="h2">Getting started</h2>
              </td>
            </tr>

            <!-- Steps -->
            <tr>
              <td class="pb-20">
                <p class="p-space">
                  ◆ Create a
                  <a href="#" class="link" style="color: #0a0a0a"
                    >new workspace</a
                  >
                  and add your custom domain
                </p>
                <p class="p-space">
                  ◆ Create your first
                  <a href="#" class="link" style="color: #0a0a0a">short link</a>
                </p>
                <p class="p-space">
                  ◆ Track advanced analytics, try bio links, and manage all your
                  links in one place.
                </p>
              </td>
            </tr>

            <!-- CTA Button -->
            <tr>
              <td class="pb-32">
                <a href="${params.dashboardUrl}" class="button" style="color: #ffffff"
                  >Go to your dashboard</a
                >
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td class="pb-24">
                <hr class="divider" />
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td>
                <p class="text-small">
                  This is an automated message from
                  <a href="#" class="footer-link">slugy</a>. If you need help,
                  reply to this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>

`,
};
