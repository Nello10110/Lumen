import type fr from '../fr/jobCard'
import type { Structure } from '../../types'

/** Espagnol — espace « jobCard » (backlog § BL.2), traduit depuis le français. */
const jobCard: Structure<typeof fr> = {
  execution: "Ejecutando...",
  active: "Activado",
  toutesLes: "Cada",
  h: "h",
  lancerMaintenant: "Ejecutar ahora",
  forcerAussiLesCotationsIndisponibles: "Forzar también las cotizaciones no disponibles",
  derniereExecution: "Última ejecución:",
  succes: "Correcto",
  echec: "Error",
  titreForcerNonCotables: "Vuelve a consultar también las posiciones que se suelen omitir (p. ej. Bricks.co) por saberse que nunca cotizan. Rara vez útil: sobre todo en caso de duda.",
  executionProgression: "Ejecutando... ({traitees} / {total} posiciones)",
  job: { market_data_refresh: {"libelle": "Actualización de los datos de mercado", "description": "Cotizaciones, composición de los ETF y principales líneas subyacentes, para todas las posiciones de la cartera."}, justetf_refresh: {"libelle": "Composición geográfica/sectorial (justETF)", "description": "Reparto real por países/sectores de los ETF en cartera, obtenido de justETF.com. Semanal por defecto: la composición de un ETF cambia lentamente y justETF no ofrece soporte en caso de bloqueo."}, sauvegarde_chiffree: {"libelle": "Copia de seguridad cifrada", "description": "Copia cifrada de la base de datos, guardada en backend/sauvegardes/ (se conservan las 10 más recientes). Requiere la variable de entorno PATRIMOINE_BACKUP_KEY en el servidor: sin ella, esta tarea falla limpiamente (visible abajo) sin afectar a las demás."}, logos_refresh: {"libelle": "Logos de las entidades", "description": "Vuelve a descargar los logos de las entidades desde su sitio oficial (o desde la dirección que haya introducido). Semanal por defecto: un logo rara vez cambia y no se reescribe nada si la imagen no ha cambiado. Un logo que haya subido usted mismo nunca se toca."}, cours_historiques: {"libelle": "Historial de cotizaciones", "description": "Completa el historial semanal de cotizaciones de los títulos en cartera, descargando solo las semanas transcurridas desde la última vez. Es lo que permite que los gráficos de evolución se muestren de inmediato: el tiempo de descarga se invierte aquí, en segundo plano, y no al abrir una pantalla."} },
}

export default jobCard
