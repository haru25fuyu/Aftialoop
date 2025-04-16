import axios from "axios";
import CONFIG from "./config.ts"; // BASE_URLが欲しいなら

const api = axios.create({
  baseURL: CONFIG.BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

export default api;
