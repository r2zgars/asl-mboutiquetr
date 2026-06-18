import nodemailer from "nodemailer";

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendVerificationEmail({ email, name, code, purpose }) {
  if (!smtpConfigured()) {
    console.log(`[E-posta doğrulama] ${email} / ${purpose}: ${code}`);
    return { sent: false };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const subject = purpose === "password_change"
    ? "Aslım Boutique şifre değiştirme kodu"
    : "Aslım Boutique e-posta doğrulama kodu";

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject,
    text: `Merhaba ${name}, doğrulama kodunuz: ${code}. Kod 10 dakika geçerlidir.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:28px;color:#111">
        <h2 style="font-weight:500">Aslım Boutique</h2>
        <p>Merhaba ${name},</p>
        <p>${subject}:</p>
        <div style="font-size:30px;letter-spacing:8px;font-weight:700;padding:18px 0">${code}</div>
        <p style="color:#666">Bu kod 10 dakika geçerlidir. Kodu siz istemediyseniz bu e-postayı yok sayabilirsiniz.</p>
      </div>
    `
  });

  return { sent: true };
}
