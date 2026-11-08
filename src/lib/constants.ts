export const MEMBERS: string[] = (
  process.env.NEXT_PUBLIC_GROUP_MEMBERS?.split(',').map(m => m.trim()).filter(Boolean)
) || ['Membro 1', 'Membro 2', 'Membro 3', 'Membro 4'];
