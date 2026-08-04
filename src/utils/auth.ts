// src/utils/auth.ts
export const isMasterUser = (user: any): boolean => {
    if (!user) return false;

    // Если прямые флаги
    if (user.isMaster) return true;

    // Если ролями является строка 'MASTER' или 'ROLE_MASTER'
    if (typeof user.role === 'string' && user.role.toUpperCase().includes('MASTER')) {
        return true;
    }

    // Если roles — это массив строк или объектов [{ authority: 'ROLE_MASTER' }] или [{ name: 'ROLE_MASTER' }]
    if (Array.isArray(user.roles)) {
        return user.roles.some((r: any) => {
            if (typeof r === 'string') {
                return r.toUpperCase().includes('MASTER');
            }
            if (typeof r === 'object' && r !== null) {
                const roleName = r.name || r.authority || r.role || '';
                return roleName.toUpperCase().includes('MASTER');
            }
            return false;
        });
    }

    return false;
};