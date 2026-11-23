-- 1. Inverte a relação Produto -> Aquisicao (um produto passa a ter várias aquisições)

-- AlterTable
ALTER TABLE "Aquisicao" ADD COLUMN     "id_produto" INTEGER;

-- Migra os vínculos existentes antes de remover a coluna antiga
UPDATE "Aquisicao" a
SET "id_produto" = p."id"
FROM "Produto" p
WHERE p."id_aquisicao" = a."id";

-- DropForeignKey
ALTER TABLE "Produto" DROP CONSTRAINT "Produto_id_aquisicao_fkey";

-- AlterTable
ALTER TABLE "Produto" DROP COLUMN "id_aquisicao";

-- AddForeignKey
ALTER TABLE "Aquisicao" ADD CONSTRAINT "Aquisicao_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "Produto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Itens do pedido e desconto

-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN     "desconto" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" SERIAL NOT NULL,
    "id_pedido" INTEGER NOT NULL,
    "id_produto" INTEGER NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "preco_unitario" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_id_pedido_fkey" FOREIGN KEY ("id_pedido") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_id_produto_fkey" FOREIGN KEY ("id_produto") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
