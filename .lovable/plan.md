
# Correção: Erro ao Cadastrar Material

## Problema
O cadastro de material falha porque os valores de unidade enviados pelo frontend não correspondem à constraint `materials_unit_check` no banco de dados.

| Banco aceita | Frontend envia (incorreto) |
|--------------|---------------------------|
| `'Unidades'` | `'unidade'` |
| `'Metros'` | `'metro'` |
| `'Litros'` | `'litro'` |
| - | `'ml'` (não existe) |
| - | `'kg'` (não existe) |

---

## Solução

Modificar o arquivo `src/components/estoque/NewMaterialModal.tsx` para usar os valores corretos.

### Alteração no código

**Arquivo:** `src/components/estoque/NewMaterialModal.tsx`

**Linhas 139-145 - Alterar de:**
```tsx
<SelectContent>
  <SelectItem value="unidade">Unidade</SelectItem>
  <SelectItem value="metro">Metro</SelectItem>
  <SelectItem value="litro">Litro</SelectItem>
  <SelectItem value="ml">Mililitro</SelectItem>
  <SelectItem value="kg">Quilograma</SelectItem>
</SelectContent>
```

**Para:**
```tsx
<SelectContent>
  <SelectItem value="Unidades">Unidades</SelectItem>
  <SelectItem value="Metros">Metros</SelectItem>
  <SelectItem value="Litros">Litros</SelectItem>
</SelectContent>
```

---

## Resumo das mudanças

1. Trocar `"unidade"` por `"Unidades"`
2. Trocar `"metro"` por `"Metros"`
3. Trocar `"litro"` por `"Litros"`
4. Remover opções `"ml"` e `"kg"` (não suportadas pelo banco)

---

## Resultado esperado

Após a correção, o cadastro de materiais funcionará corretamente salvando os dados no Supabase.
