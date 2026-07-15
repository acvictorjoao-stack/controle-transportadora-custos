/** Mensagens padronizadas de feedback ao usuário (Sprint 25.6). */

export const MSG = {
  operationFailed: 'Não foi possível concluir a operação.',
  deleteConfirmTitle: 'Excluir registro',
  deleteConfirmDescription: 'Deseja realmente excluir este registro?',
  deleteConfirmLabel: 'Excluir',
  deleteDocumentTitle: 'Excluir documento',
  deleteDocumentDescription: 'Deseja realmente excluir este documento?',
  created: (entity: string) => `${entity} cadastrado com sucesso.`,
  createdFeminine: (entity: string) => `${entity} cadastrada com sucesso.`,
  updated: (entity: string) => `${entity} atualizado com sucesso.`,
  updatedFeminine: (entity: string) => `${entity} atualizada com sucesso.`,
  deleted: (entity: string) => `${entity} excluído com sucesso.`,
  deletedFeminine: (entity: string) => `${entity} excluída com sucesso.`,
  statusChanged: (entity: string, label: string) =>
    `${entity} marcado como ${label}.`,
  statusChangedFeminine: (entity: string, label: string) =>
    `${entity} marcada como ${label}.`,
  activated: (entity: string) => `${entity} ativado com sucesso.`,
  activatedFeminine: (entity: string) => `${entity} ativada com sucesso.`,
  deactivated: (entity: string) => `${entity} inativado com sucesso.`,
  deactivatedFeminine: (entity: string) => `${entity} inativada com sucesso.`,
} as const;
