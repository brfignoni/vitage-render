const fs = require("fs");
const path = require("path");
const { logger, memoryTransport } = require("./logger");
const { sendEmail } = require("./mailer");

const envFilePath = path.join(__dirname, ".env");

const EMAIL_VITAGE = process.env.EMAIL_ETIQUETA;
const EMAIL_DEV = process.env.EMAIL_DEV;
const EMAIL_LOGS = `${process.env.EMAIL_DEV}, ${process.env.EMAIL_ETIQUETA}`;

// -----------------------------------------------------------------------------
// enviarLogsPorCorreo
// -----------------------------------------------------------------------------

/**
 * Send logs via email.
 *
 * This function retrieves logs from the in-memory transport, constructs an HTML message
 * with the log details, and sends an email. The email subject is determined based on the
 * presence of error or warning logs. After sending the email, the in-memory log store is cleared.
 *
 * @param {string} tablaDatosCliente - An HYML table with the client basic information.
 */
const enviarLogsPorCorreo = (
  tablaDatosCliente,
  getPegoteResponse,
  produccionActivado
) => {
  console.log("produccionActivado en enviarLogsPorCorreo", produccionActivado);
  const logs = memoryTransport.getLogs();

  console.log("logs", logs);

  // Construct the email message with log details.
  let mensajeCorreo = `<strong>📝 Detalle de los eventos</strong>: <br><div style="font-family: 'Courier New', Courier, monospace;">`;
  mensajeCorreo += logs
    .map((log) => `[${log.level}] ${log.message}`)
    .join("<br>");
  mensajeCorreo += "</div>";

  // Clear logs after reading them.
  memoryTransport.clearLogs();

  // Determine if there are any errors or warnings in the logs.
  const contieneErrores = logs.some((log) => log.level === "error");
  const contieneWarnings = logs.some((log) => log.level === "warn");

  let asunto;
  const asuntoDetail = 

  if (produccionActivado) {
    asunto = `Proceso exitoso`;
  } else {
    asunto = `[TESTING] Proceso exitoso`;
  }

  if (contieneErrores) {
    asunto = "Hubo errores en el proceso";
  } else if (contieneWarnings) {
    asunto = "Hubo advertencias en el proceso";
  }

  // Append additional information to the email message.
  mensajeCorreo += tablaDatosCliente;

  // Send the email and log the result.
  sendEmail(EMAIL_VITAGE, EMAIL_DEV, asunto, mensajeCorreo, getPegoteResponse)
    .then(() => logger.info("Correo enviado exitosamente con los logs."))
    .catch((error) => logger.info("Error al enviar el correo:", error.message));
};

// -----------------------------------------------------------------------------
// enviarEmailACliente
// -----------------------------------------------------------------------------

const enviarEmailACliente = (info) => {
  const emailCliente = info.datosCliente["Correo"];

  let asunto = `📦 ¡Tu pedido de VitAge fue despachado a DAC y pronto estará en camino!`;

  // Construct the email message with log details.
  let mensajeCorreo = `<p>Estimada/o ${info.datosCliente["Nombre"]},</p>
<p>
  Queremos informarte que tu compra en VitAge será despachada a través de DAC. A
  continuación, te compartimos los detalles de tu envío para que puedas hacer el
  seguimiento:
</p>

<p>
  <strong>🔹 Código de rastreo:</strong> ${info.codigoRastreo}<br />
  <strong>🔹 Seguimiento en línea:</strong>
  <a href="https://www.dac.com.uy/envios/rastrear" target="_blank"
    >DAC - Rastreo de envíos</a
  >
</p>

<h3>📌 Información sobre la entrega:</h3>
<p>
  🚚 <strong>Plazo de entrega:</strong> DAC realiza entregas en 24 - 48 horas
  hábiles dentro del horario de 9:00 a 20:00. <br />
  📍 <strong>Si no te encuentran en el domicilio:</strong> tu paquete quedará
  disponible para retiro en la sucursal DAC más cercana.<br />
  📞 <strong>Para consultas:</strong> podés comunicarte con DAC al
  <strong>1717</strong> con tu número de rastreo en mano.
</p>

<p>
  Si tenés cualquier duda, estamos a tu disposición. ¡Gracias por confiar en
  nosotros! ✨🌿
</p>
<p>Saludos,<br />El equipo de VitAge</p>`;

  // Send the email and log the result.
  sendEmail(emailCliente, EMAIL_LOGS, asunto, mensajeCorreo)
    .then(() => logger.info("Correo enviado exitosamente al cliente."))
    .catch((error) =>
      logger.info("Error al enviar el correo para el cliente:", error.message)
    );
};

// -----------------------------------------------------------------------------
// generateClientTableInfo
// -----------------------------------------------------------------------------

/**
 * Generate an HTML table from client data for inclusion in an email.
 *
 * This function takes a response object (presumably from a web service) containing client details
 * and builds an HTML table. Only the key-value pairs where the value is not an empty string are included.
 *
 * @param {object} wsInGuiaLevanteResponse - Response object containing client recipient data.
 * @returns {string} HTML string representing a table with the client's details.
 */
const generateClientTableInfo = (datosCliente) => {
  // Build table rows for each non-empty key-value pair.
  const rows = Object.entries(datosCliente)
    .filter(([_, value]) => value !== "")
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding: 2px 8px; border: 1px solid #ddd;"><strong>${key.replace(
          /_/g,
          " "
        )}</strong></td>
        <td style="padding: 2px 8px; border: 1px solid #ddd;">${value}</td>
      </tr>`
    )
    .join("");

  return `<p></p>
    <table style="width: 100%; max-width: 360px; border-collapse: collapse;" border="1" cellpadding="5" cellspacing="0">
      <thead>
        <tr style="background-color: #f2f2f2; text-align: center;">
          <td colspan="2" style="padding: 2px 8px; border: 1px solid #ddd;">Datos Cliente Destinatario</td>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
};

// -----------------------------------------------------------------------------
// setEnvValue
// -----------------------------------------------------------------------------

/**
 * Set or update an environment variable in the .env file.
 *
 * This function checks if a given key exists in the .env file and updates its value,
 * or adds it if it does not exist. The updated content is then saved back to the file.
 *
 * @param {string} key - The environment variable key.
 * @param {string} value - The value to set for the environment variable.
 */
const setEnvValue = (key, value) => {
  // Read existing .env file content or initialize as an empty string.
  let envContent = fs.existsSync(envFilePath)
    ? fs.readFileSync(envFilePath, "utf8")
    : "";
  const envVarRegex = new RegExp(`^${key}=.*$`, "m");

  // Replace the variable if it exists; otherwise, append it.
  envContent = envVarRegex.test(envContent)
    ? envContent.replace(envVarRegex, `${key}=${value}`)
    : envContent +
      (envContent && !envContent.endsWith("\n") ? "\n" : "") +
      `${key}=${value}\n`;

  // Write the updated content back to the .env file.
  fs.writeFileSync(envFilePath, envContent, "utf8");
};

// Export functions for use in other modules.
module.exports = {
  enviarLogsPorCorreo,
  enviarEmailACliente,
  generateClientTableInfo,
  setEnvValue,
};
