import api from "./axios";

export const login = (data) =>
    api.post("token/", data);
export const refresh = (data) =>
    api.post("token/refresh/", data);
export const getProfile = () =>
    api.get("users/profile/");

