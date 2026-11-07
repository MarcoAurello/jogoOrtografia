// o pdf-parse é importado pelo arquivo interno: o index.js dele lê um PDF de exemplo quando roda sem "module.parent"
declare module "pdf-parse/lib/pdf-parse.js" {
  import pdf from "pdf-parse";
  export default pdf;
}
