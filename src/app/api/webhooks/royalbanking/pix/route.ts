/**
 * Rota legada — mesmo handler que `/api/webhooks/mangofy/pix`.
 * Mantém URLs já configuradas no gateway; prefere configurar Mangofy com `/api/webhooks/mangofy/pix`.
 */
export { POST } from "../../mangofy/pix/route";
