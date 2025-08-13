const crypto = require("crypto");
const express = require("express");
const app = express();
const NodeCache = require("node-cache");

const PRODUCCION_ACTIVADO = process.env.ENTORNO === "PRODUCCION" ? true : false;

const PORT = process.env.PORT || 3000;
const eventCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
}); // Store for 5 min

const { logger } = require("./logger");
const { loginToDAC, wsInGuia_Levante, wsGetpegote } = require("./dac");
const {
  setEnvValue,
  generateClientTableInfo,
  enviarLogsPorCorreo,
  enviarEmailACliente,
  apiResponse,
} = require("./helpers");

console.log(`hola #3`);
console.log(`This is the vitAge render server.`);
console.log(`Running on environment: ${process.env.ENTORNO}`);

// Middleware to capture raw body
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

/**
 * Webhook handler endpoint for processing Shopify events.
 */
app.post("/webhook", async (req, res) => {
  const webhookData = req.body;

  // Check if the order is for local pickup
  const isLocalPickup = webhookData.shipping_address === null;

  if (isLocalPickup) {
    // Ignore local pickup orders
    return res.status(200).send("Ignored local pickup order");
  }

  let infoParaEmail = {};
  let getPegoteResponse;

  const hmacHeader = req.get("X-Shopify-Hmac-Sha256");
  const generatedHmac = crypto
    .createHmac("sha256", process.env.SHOPIFY_SECRET)
    .update(req.rawBody, "utf8")
    .digest("base64");

  if (hmacHeader !== generatedHmac) {
    logger.error("HMAC Unauthorized");
    return res.status(401).send("Unauthorized"); // Ensures exit on failure
  }

  const eventId = req.get("X-Shopify-Event-Id");

  if (eventCache.has(eventId)) {
    logger.info(`Webhook id (duplicate): ${eventId}`);
    return res.status(200).send("Duplicate webhook ignored.");
  } else {
    logger.info(`Webhook id: ${eventId}`);
  }

  eventCache.set(eventId, true); // Store event ID

  // Respond to Shopify immediately ro prevent a duplicate webhook
  res.status(200).send("Webhook received and processing started.");

  // Continue processing in the background
  setImmediate(async () => {
    try {
      let dacSessionId = process.env.DAC_SESSION_ID;
      let wsInGuia_Levante_Response = await wsInGuia_Levante(
        dacSessionId,
        webhookData
      );

      if (!wsInGuia_Levante_Response.ok) {
        dacSessionId = await loginToDAC();
        if (dacSessionId) {
          setEnvValue("DAC_SESSION_ID", dacSessionId);
          wsInGuia_Levante_Response = await wsInGuia_Levante(
            dacSessionId,
            webhookData
          );
        }
      }

      if (!wsInGuia_Levante_Response.ok) {
        logger.error("wsInGuia_Levante failed", wsInGuia_Levante_Response);
      } else {
        // Success case
        const datosCliente = wsInGuia_Levante_Response.datosCliente;
        infoParaEmail.tablaDatosCliente = generateClientTableInfo(datosCliente);
        infoParaEmail.codigoRastreo = wsInGuia_Levante_Response.codigoRastreo;
        infoParaEmail.datosCliente = datosCliente;

        if (PRODUCCION_ACTIVADO) {
          void enviarEmailACliente(infoParaEmail);
        }

        const getPegoteParams = wsInGuia_Levante_Response.getPegoteParams;
        getPegoteResponse = await wsGetpegote(getPegoteParams);
      }
    } catch (error) {
      logger.error("Error processing the webhook: " + error.message);
    } finally {
      void enviarLogsPorCorreo(
        infoParaEmail.tablaDatosCliente,
        getPegoteResponse,
        PRODUCCION_ACTIVADO
      ); // Background task
    }
  });
});

// Start the server
app.listen(PORT, () => {
  // logger.info(`Server is running on port ${PORT}`);
});
