
# Correcao: Preferencias, Login Google e Travamento

## Problemas Identificados

1. **Login Google quebra o onboarding**: O redirect OAuth recarrega a pagina, resetando todo o estado React do OnboardingModal (step volta a 0, selecoes perdidas).
2. **Preferencias nao salvam**: O onboarding reinicia apos redirect, impedindo que o usuario chegue ao passo final onde `onComplete` salva no banco.
3. **Travamento apos login**: O onboarding renderiza antes de `authLoading` resolver, causando flash e possiveis loops.
4. **Erros ao editar interesses/regioes no perfil**: ProfileScreen chama `useAuth()` na linha 88, criando uma segunda instancia do hook com estado proprio. O `updateProfile` dessa instancia nao atualiza o `profile` do Index.

## Solucao

### 1. OnboardingModal: persistir estado no localStorage

- Salvar `realia_onboarding_step`, `realia_onboarding_interests`, `realia_onboarding_regions` no localStorage
- Inicializar estado a partir do localStorage ao montar
- Receber `user` e `authLoading` como props
- Quando monta com usuario ja logado, pular automaticamente step 1 (auth) para step 2 (interesses)
- Limpar chaves temporarias ao completar onboarding

### 2. Index.tsx: sincronizar onboarding com auth

- NAO renderizar OnboardingModal enquanto `authLoading === true`
- Passar `user` e `authLoading` como props para OnboardingModal
- Passar `updateProfile` como prop para ProfileScreen

### 3. ProfileScreen: eliminar instancia duplicada do useAuth

- Receber `updateProfile` como prop do Index
- Remover chamada `useAuth()` para `updateProfile` (manter apenas `signOut`)
- Isso garante que salvar interesses/regioes atualiza o estado na instancia correta

### 4. useAuth: tratamento de erro robusto

- Envolver fetch do profile em try/catch
- Garantir que `authLoading` e `profileLoading` sempre resolvam para `false`, mesmo em caso de erro

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/components/OnboardingModal.tsx` | Adicionar props user/authLoading, persistir estado no localStorage, pular step de auth se ja logado |
| `src/pages/Index.tsx` | Condicionar renderizacao do onboarding a `!authLoading`, passar props ao OnboardingModal e ProfileScreen |
| `src/components/ProfileScreen.tsx` | Receber `updateProfile` como prop, remover do useAuth interno |
| `src/hooks/useAuth.ts` | Adicionar try/catch no fetch do profile |

## Fluxo Corrigido (Login Google no Onboarding)

```text
1. Usuario abre app -> authLoading = true -> onboarding NAO renderiza
2. Auth resolve -> sem usuario -> onboarding renderiza no step 0
3. Usuario avanca -> step 1 (auth) -> clica Google
4. Estado salvo: step=1 no localStorage
5. Redirect OAuth -> pagina recarrega completamente
6. App monta -> authLoading = true -> onboarding NAO renderiza
7. Auth resolve -> usuario existe -> onboarding le step do localStorage
8. Como usuario ja esta logado, pula step 1 -> vai para step 2 (interesses)
9. Usuario seleciona interesses -> step 3 (regioes)
10. Conclui -> salva no banco -> limpa localStorage temporario
```
