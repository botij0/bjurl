import axios from "axios";

const urlApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export { urlApi };
