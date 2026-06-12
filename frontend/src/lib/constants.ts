export const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'yellow' },
  confirmed: { label: '已确认', color: 'blue' },
  shipped: { label: '已发货', color: 'purple' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'red' },
};

export const ROLES: Record<string, string> = {
  admin: '管理员',
  manager: '经理',
  operator: '操作员',
  viewer: '查看者',
};

export const PRICE_TYPES = ['批发价', '零售价', '促销价'];
export const CURRENCIES = ['USD', 'EUR', 'CNY', 'GBP', 'JPY'];
