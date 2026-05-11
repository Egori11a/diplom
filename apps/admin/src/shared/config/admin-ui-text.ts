const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildPattern = (aliases: readonly string[]): RegExp =>
  new RegExp(aliases.map(escapeRegExp).join("|"), "i");

export const adminUiText = {
  hero: {
    title: "Центр управления фича-тогглами",
    subtitle: "Группы команд, тогглы и управляемая раскатка в одной системе."
  },
  tabs: {
    onboarding: "Обучение",
    groups: "Группы",
    toggles: "Фича-тогглы",
    users: "Пользователи",
    audit: "Аудит"
  },
  auth: {
    heading: "Вход администратора",
    emailLabel: "Почта",
    passwordLabel: "Пароль",
    loginButton: "Войти"
  },
  groups: {
    heading: "Группы команд",
    nameLabel: "Название группы",
    descriptionLabel: "Описание",
    createButton: "Создать группу"
  },
  toggles: {
    heading: "Фича-тогглы",
    createButton: "Создать тоггл"
  },
  users: {
    heading: "Пользователи админки",
    createButton: "Создать пользователя",
    emailLabel: "Email",
    passwordLabel: "Пароль",
    roleLabel: "Роль",
    resetPasswordHeading: "Сброс пароля"
  },
  audit: {
    heading: "Журнал аудита",
    actorEmailLabel: "Email администратора",
    actionLabel: "Действие",
    entityTypeLabel: "Тип сущности",
    limitLabel: "Лимит",
    detailsHeading: "Детали события"
  },
  toggleDrawer: {
    createHeading: "Создание тоггла",
    editHeading: "Редактирование тоггла",
    closeButton: "Закрыть"
  }
} as const;

export const adminUiAliases = {
  auth: {
    heading: [adminUiText.auth.heading, "Admin login"],
    emailLabel: [adminUiText.auth.emailLabel, "Email"],
    passwordLabel: [adminUiText.auth.passwordLabel, "Password"],
    loginButton: [adminUiText.auth.loginButton, "Sign in", "Login"]
  },
  tabs: {
    onboarding: [adminUiText.tabs.onboarding, "Onboarding"],
    groups: [adminUiText.tabs.groups, "Groups"],
    toggles: [adminUiText.tabs.toggles, adminUiText.toggles.heading, "Toggles"],
    users: [adminUiText.tabs.users, "Users"],
    audit: [adminUiText.tabs.audit, "Audit"]
  },
  groups: {
    heading: [adminUiText.groups.heading, "Team groups", "Groups"],
    nameLabel: [adminUiText.groups.nameLabel, "Group name"],
    descriptionLabel: [adminUiText.groups.descriptionLabel, "Description"],
    createButton: [adminUiText.groups.createButton, "Create group"]
  },
  toggles: {
    heading: [adminUiText.toggles.heading, adminUiText.tabs.toggles],
    createButton: [adminUiText.toggles.createButton, "Создать тоггл"]
  },
  users: {
    heading: [adminUiText.users.heading, adminUiText.tabs.users],
    createButton: [adminUiText.users.createButton, "Create user"],
    emailLabel: [adminUiText.users.emailLabel, "Email"],
    passwordLabel: [adminUiText.users.passwordLabel, "Password"],
    roleLabel: [adminUiText.users.roleLabel, "Role"]
  },
  audit: {
    heading: [adminUiText.audit.heading, adminUiText.tabs.audit],
    actorEmailLabel: [adminUiText.audit.actorEmailLabel, "Admin email"],
    actionLabel: [adminUiText.audit.actionLabel, "Action"],
    entityTypeLabel: [adminUiText.audit.entityTypeLabel, "Entity type"],
    limitLabel: [adminUiText.audit.limitLabel, "Limit"]
  },
  toggleDrawer: {
    heading: [adminUiText.toggleDrawer.createHeading, "Создание тоггла"],
    closeButton: [adminUiText.toggleDrawer.closeButton, "Закрыть"]
  }
} as const;

export const adminUiPatterns = {
  auth: {
    heading: buildPattern(adminUiAliases.auth.heading),
    emailLabel: buildPattern(adminUiAliases.auth.emailLabel),
    passwordLabel: buildPattern(adminUiAliases.auth.passwordLabel),
    loginButton: buildPattern(adminUiAliases.auth.loginButton)
  },
  tabs: {
    onboarding: buildPattern(adminUiAliases.tabs.onboarding),
    groups: buildPattern(adminUiAliases.tabs.groups),
    toggles: buildPattern(adminUiAliases.tabs.toggles),
    users: buildPattern(adminUiAliases.tabs.users),
    audit: buildPattern(adminUiAliases.tabs.audit)
  },
  groups: {
    heading: buildPattern(adminUiAliases.groups.heading),
    nameLabel: buildPattern(adminUiAliases.groups.nameLabel),
    descriptionLabel: buildPattern(adminUiAliases.groups.descriptionLabel),
    createButton: buildPattern(adminUiAliases.groups.createButton)
  },
  toggles: {
    heading: buildPattern(adminUiAliases.toggles.heading),
    createButton: buildPattern(adminUiAliases.toggles.createButton)
  },
  users: {
    heading: buildPattern(adminUiAliases.users.heading),
    createButton: buildPattern(adminUiAliases.users.createButton),
    emailLabel: buildPattern(adminUiAliases.users.emailLabel),
    passwordLabel: buildPattern(adminUiAliases.users.passwordLabel),
    roleLabel: buildPattern(adminUiAliases.users.roleLabel)
  },
  audit: {
    heading: buildPattern(adminUiAliases.audit.heading),
    actorEmailLabel: buildPattern(adminUiAliases.audit.actorEmailLabel),
    actionLabel: buildPattern(adminUiAliases.audit.actionLabel),
    entityTypeLabel: buildPattern(adminUiAliases.audit.entityTypeLabel),
    limitLabel: buildPattern(adminUiAliases.audit.limitLabel)
  },
  toggleDrawer: {
    heading: buildPattern(adminUiAliases.toggleDrawer.heading),
    closeButton: buildPattern(adminUiAliases.toggleDrawer.closeButton)
  }
} as const;
