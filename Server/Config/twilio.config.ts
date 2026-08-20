import twilio from "twilio";

const account_sid = process.env.TWILIO_ACCOUNT_SID;
const auth_token = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(account_sid, auth_token);

export default client;
