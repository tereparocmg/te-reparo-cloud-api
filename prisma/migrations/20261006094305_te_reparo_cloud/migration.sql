-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'VENDEDOR');

-- CreateEnum
CREATE TYPE "EspecialidadOperario" AS ENUM ('ELECTRONICA', 'INFORMATICA');

-- CreateEnum
CREATE TYPE "TipoCategoria" AS ENUM ('PRODUCTO', 'PIEZA');

-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('PERSONA_NATURAL', 'EMPRESA');

-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('COMPLETADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "EstadoServicio" AS ENUM ('PENDIENTE', 'COMPLETADO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "TipoServicio" AS ENUM ('ELECTRONICA', 'INFORMATICA');

-- CreateEnum
CREATE TYPE "TipoGarantia" AS ENUM ('PRODUCTO', 'SERVICIO');

-- CreateEnum
CREATE TYPE "EstadoGarantia" AS ENUM ('ACTIVA', 'VENCIDA', 'INVALIDADA');

-- CreateEnum
CREATE TYPE "ResolucionReclamacion" AS ENUM ('REPARACION_SIN_COSTO', 'REEMPLAZO', 'RECHAZO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('INGRESO', 'GASTO', 'COMPRA');

-- CreateEnum
CREATE TYPE "UrgenciaPedido" AS ENUM ('BAJA', 'MEDIA', 'ALTA');

-- CreateEnum
CREATE TYPE "EstadoPedido" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'CONVERTIDO');

-- CreateEnum
CREATE TYPE "TipoDevolucion" AS ENUM ('PRODUCTO', 'PIEZA');

-- CreateEnum
CREATE TYPE "EstadoDevolucion" AS ENUM ('PENDIENTE_REVISION', 'APROBADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "TipoComisionEntry" AS ENUM ('SALE', 'SERVICE');

-- CreateEnum
CREATE TYPE "EstadoCommissionEntry" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EstadoOperatorPayment" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "SyncOperation" AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('WORKSHOP', 'SUPER_ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "workshops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "apiTokenHash" TEXT NOT NULL,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_events" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "operation" "SyncOperation" NOT NULL,
    "payload" JSONB NOT NULL,
    "cloudVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredTo" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "sync_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorType" "ActorType" NOT NULL,
    "action" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT,
    "workshopId" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" "RolUsuario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talleres" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "encargado" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "rfc" TEXT,
    "razonSocial" TEXT,
    "ciudad" TEXT,
    "codigoPostal" TEXT,
    "limiteDescuento" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "horarioApertura" TEXT,
    "horarioCierre" TEXT,
    "metodosPago" TEXT NOT NULL DEFAULT 'Efectivo,Tarjeta,Transferencia',
    "garantiaProductoDias" INTEGER NOT NULL DEFAULT 30,
    "garantiaServicioDias" INTEGER NOT NULL DEFAULT 90,
    "plantillaGarantia" TEXT,
    "formatoTicket" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),

    CONSTRAINT "talleres_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_taller" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "usuario_taller_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "especialidad" "EspecialidadOperario" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "operarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "tipo" "TipoCliente" NOT NULL DEFAULT 'PERSONA_NATURAL',
    "rfc" TEXT,
    "direccion" TEXT,
    "esClienteGeneral" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoCategoria" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "tallerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "codigoBarras" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precioCosto" DOUBLE PRECISION NOT NULL,
    "precioVenta" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 5,
    "garantiaDias" INTEGER NOT NULL DEFAULT 30,
    "categoriaId" TEXT,
    "tallerId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "operatorCommissionType" TEXT,
    "operatorCommissionValue" DOUBLE PRECISION,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "piezas" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "codigoBarras" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "costoUnitario" DOUBLE PRECISION NOT NULL,
    "precioVenta" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "stockMinimo" INTEGER NOT NULL DEFAULT 5,
    "garantiaFabricaDias" INTEGER,
    "categoriaId" TEXT,
    "tallerId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "operatorPaymentType" TEXT,
    "operatorPaymentValue" DOUBLE PRECISION,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),

    CONSTRAINT "piezas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "operarioId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "metodoPago" TEXT NOT NULL DEFAULT 'Efectivo',
    "estado" "EstadoVenta" NOT NULL DEFAULT 'COMPLETADA',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venta_items" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "venta_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicios" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "operarioId" TEXT NOT NULL,
    "tipo" "TipoServicio" NOT NULL,
    "marca" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "imei" TEXT,
    "problemaReportado" TEXT NOT NULL,
    "diagnostico" TEXT,
    "descripcionServicio" TEXT NOT NULL,
    "estado" "EstadoServicio" NOT NULL DEFAULT 'COMPLETADO',
    "precioManoObra" DOUBLE PRECISION NOT NULL,
    "subtotalPiezas" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "metodoPago" TEXT NOT NULL DEFAULT 'Efectivo',
    "pagado" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "fechaEntrega" TIMESTAMP(3),
    "garantiaDias" INTEGER NOT NULL DEFAULT 90,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "servicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicio_item_piezas" (
    "id" TEXT NOT NULL,
    "servicioId" TEXT NOT NULL,
    "piezaId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "costoUnitario" DOUBLE PRECISION NOT NULL,
    "precioVenta" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "servicio_item_piezas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "garantias" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "ventaId" TEXT,
    "servicioId" TEXT,
    "tipo" "TipoGarantia" NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "duracionDias" INTEGER NOT NULL,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "descripcionCobertura" TEXT,
    "estado" "EstadoGarantia" NOT NULL DEFAULT 'ACTIVA',
    "emitidaPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "garantias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reclamaciones_garantia" (
    "id" TEXT NOT NULL,
    "garantiaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT NOT NULL,
    "resolucion" "ResolucionReclamacion" NOT NULL,
    "motivoResolucion" TEXT,
    "atendidaPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "reclamaciones_garantia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devoluciones" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "tipo" "TipoDevolucion" NOT NULL,
    "ventaId" TEXT,
    "servicioId" TEXT,
    "productoId" TEXT,
    "piezaId" TEXT,
    "cantidad" INTEGER NOT NULL,
    "motivo" TEXT NOT NULL,
    "estado" "EstadoDevolucion" NOT NULL DEFAULT 'PENDIENTE_REVISION',
    "revisadaPorId" TEXT,
    "fechaRevision" TIMESTAMP(3),
    "notasRevision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "devoluciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos" (
    "id" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "categoria" TEXT,
    "usuarioId" TEXT NOT NULL,
    "ventaId" TEXT,
    "servicioId" TEXT,
    "compraId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos" (
    "id" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "categoria" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "gastos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compras" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "proveedor" TEXT,
    "total" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "compras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compra_items" (
    "id" TEXT NOT NULL,
    "compraId" TEXT NOT NULL,
    "productoId" TEXT,
    "piezaId" TEXT,
    "cantidad" INTEGER NOT NULL,
    "costoUnitario" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "compra_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos_internos" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "solicitanteId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "urgencia" "UrgenciaPedido" NOT NULL DEFAULT 'MEDIA',
    "estado" "EstadoPedido" NOT NULL DEFAULT 'PENDIENTE',
    "aprobadoPorId" TEXT,
    "fechaAprobacion" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "pedidos_internos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_entries" (
    "id" TEXT NOT NULL,
    "operarioId" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "ventaId" TEXT,
    "servicioId" TEXT,
    "ventaItemProductoId" TEXT,
    "servicioItemPiezaId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "TipoComisionEntry" NOT NULL,
    "description" TEXT NOT NULL,
    "estado" "EstadoCommissionEntry" NOT NULL DEFAULT 'ACTIVE',
    "operatorPaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "commission_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_payments" (
    "id" TEXT NOT NULL,
    "folio" TEXT NOT NULL,
    "operarioId" TEXT NOT NULL,
    "tallerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "paidById" TEXT,
    "status" "EstadoOperatorPayment" NOT NULL DEFAULT 'PENDING',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "operator_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion_global" (
    "id" TEXT NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'USD',
    "formatoTicket" TEXT,
    "datosFiscalesEmpresa" TEXT,
    "pais" TEXT NOT NULL DEFAULT 'Cuba',
    "tipoCambio" DOUBLE PRECISION NOT NULL DEFAULT 650,
    "serverUrl" TEXT,
    "ultimoSync" TIMESTAMP(3),
    "syncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "syncInterval" INTEGER NOT NULL DEFAULT 5,
    "adminPaymentType" TEXT,
    "adminPaymentValue" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "originWorkshopId" TEXT,
    "cloudVersion" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedFromWorkshopAt" TIMESTAMP(3),
    "lastSyncedToWorkshopAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "configuracion_global_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workshops_apiTokenHash_key" ON "workshops"("apiTokenHash");

-- CreateIndex
CREATE INDEX "sync_events_workshopId_cloudVersion_idx" ON "sync_events"("workshopId", "cloudVersion");

-- CreateIndex
CREATE INDEX "sync_events_tableName_recordId_idx" ON "sync_events"("tableName", "recordId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_tableName_recordId_idx" ON "audit_logs"("tableName", "recordId");

-- CreateIndex
CREATE INDEX "audit_logs_workshopId_createdAt_idx" ON "audit_logs"("workshopId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_taller_usuarioId_tallerId_key" ON "usuario_taller"("usuarioId", "tallerId");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigoBarras_key" ON "productos"("codigoBarras");

-- CreateIndex
CREATE UNIQUE INDEX "piezas_codigoBarras_key" ON "piezas"("codigoBarras");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_folio_key" ON "ventas"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "servicios_folio_key" ON "servicios"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "garantias_folio_key" ON "garantias"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "garantias_ventaId_key" ON "garantias"("ventaId");

-- CreateIndex
CREATE UNIQUE INDEX "garantias_servicioId_key" ON "garantias"("servicioId");

-- CreateIndex
CREATE UNIQUE INDEX "devoluciones_folio_key" ON "devoluciones"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "movimientos_compraId_key" ON "movimientos"("compraId");

-- CreateIndex
CREATE UNIQUE INDEX "compras_folio_key" ON "compras"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_internos_folio_key" ON "pedidos_internos"("folio");

-- CreateIndex
CREATE UNIQUE INDEX "operator_payments_folio_key" ON "operator_payments"("folio");

-- AddForeignKey
ALTER TABLE "sync_events" ADD CONSTRAINT "sync_events_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talleres" ADD CONSTRAINT "talleres_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_taller" ADD CONSTRAINT "usuario_taller_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_taller" ADD CONSTRAINT "usuario_taller_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_taller" ADD CONSTRAINT "usuario_taller_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operarios" ADD CONSTRAINT "operarios_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categorias" ADD CONSTRAINT "categorias_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piezas" ADD CONSTRAINT "piezas_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "categorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piezas" ADD CONSTRAINT "piezas_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "piezas" ADD CONSTRAINT "piezas_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_operarioId_fkey" FOREIGN KEY ("operarioId") REFERENCES "operarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "venta_items" ADD CONSTRAINT "venta_items_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_operarioId_fkey" FOREIGN KEY ("operarioId") REFERENCES "operarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicios" ADD CONSTRAINT "servicios_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicio_item_piezas" ADD CONSTRAINT "servicio_item_piezas_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicio_item_piezas" ADD CONSTRAINT "servicio_item_piezas_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "piezas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicio_item_piezas" ADD CONSTRAINT "servicio_item_piezas_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garantias" ADD CONSTRAINT "garantias_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garantias" ADD CONSTRAINT "garantias_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garantias" ADD CONSTRAINT "garantias_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garantias" ADD CONSTRAINT "garantias_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garantias" ADD CONSTRAINT "garantias_emitidaPorId_fkey" FOREIGN KEY ("emitidaPorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "garantias" ADD CONSTRAINT "garantias_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamaciones_garantia" ADD CONSTRAINT "reclamaciones_garantia_garantiaId_fkey" FOREIGN KEY ("garantiaId") REFERENCES "garantias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reclamaciones_garantia" ADD CONSTRAINT "reclamaciones_garantia_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_revisadaPorId_fkey" FOREIGN KEY ("revisadaPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devoluciones" ADD CONSTRAINT "devoluciones_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "ventas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "servicios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compras" ADD CONSTRAINT "compras_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "compras"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_piezaId_fkey" FOREIGN KEY ("piezaId") REFERENCES "piezas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compra_items" ADD CONSTRAINT "compra_items_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_internos" ADD CONSTRAINT "pedidos_internos_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_internos" ADD CONSTRAINT "pedidos_internos_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_internos" ADD CONSTRAINT "pedidos_internos_aprobadoPorId_fkey" FOREIGN KEY ("aprobadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedidos_internos" ADD CONSTRAINT "pedidos_internos_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_operarioId_fkey" FOREIGN KEY ("operarioId") REFERENCES "operarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_operatorPaymentId_fkey" FOREIGN KEY ("operatorPaymentId") REFERENCES "operator_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commission_entries" ADD CONSTRAINT "commission_entries_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_payments" ADD CONSTRAINT "operator_payments_operarioId_fkey" FOREIGN KEY ("operarioId") REFERENCES "operarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_payments" ADD CONSTRAINT "operator_payments_tallerId_fkey" FOREIGN KEY ("tallerId") REFERENCES "talleres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operator_payments" ADD CONSTRAINT "operator_payments_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "configuracion_global" ADD CONSTRAINT "configuracion_global_originWorkshopId_fkey" FOREIGN KEY ("originWorkshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;
