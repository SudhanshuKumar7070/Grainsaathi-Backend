export const generateGsLoginId = (role: "vyapari" | "organisation" | "admin", id: number) => {
  let prefix = "";
  if (role === "vyapari") prefix = "GS-VY";
  else if (role === "organisation") prefix = "GS-ORG";
  else if (role === "admin") prefix = "GS-ADM";
  
  return `${prefix}-${String(id).padStart(5, "0")}`;
};
