/**
 * ALLOWED_TABLES — syncable Prisma delegates (lowerCamelCase names
 * matching `prisma.<tableName>`).
 *
 * The schema currently exposes 23 syncable models (every model that
 * has an `originWorkshopId` cloud field).  When the spec mentions
 * "16 syncable table names", that count refers to the original set
 * before additional cloud entities were introduced; the array below
 * is the complete set the API actually supports.
 *
 * Adding a new syncable model only requires:
 *   1. Add the model to `prisma/schema.prisma` with originWorkshopId
 *      + cloudVersion + cloudWorkshop back-relation.
 *   2. Append its delegate name to this array.
 *
 * Removing a syncable model just requires pruning this array — the
 * generic `prisma[tableName]` delegate lookup will throw a friendly
 * BadRequestException for unknown names.
 */
export const ALLOWED_TABLES: readonly string[] = [
  'taller',
  'usuario',
  'usuarioTaller',
  'operario',
  'cliente',
  'categoria',
  'producto',
  'pieza',
  'venta',
  'ventaItem',
  'servicio',
  'servicioItemPieza',
  'garantia',
  'reclamacionGarantia',
  'devolucion',
  'movimiento',
  'gasto',
  'compra',
  'compraItem',
  'pedidoInterno',
  'commissionEntry',
  'operatorPayment',
  'configuracionGlobal',
];

/**
 * Tables whose `originWorkshopId` may legitimately be NULL because
 * the row is shared across all workshops (a "global" record). The
 * bootstrap endpoint pulls these in addition to the workshop-local
 * records when the workshop connects for the first time.
 */
export const GLOBAL_TABLES: readonly string[] = [
  'taller',
  'usuario',
  'configuracionGlobal',
];

/**
 * Helper — type guard for runtime validation of table names coming
 * from URL parameters or request bodies.
 */
export function isAllowedTable(name: string): boolean {
  return ALLOWED_TABLES.includes(name);
}
