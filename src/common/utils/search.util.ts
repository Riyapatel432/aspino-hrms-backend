import { Prisma } from '@prisma/client';

export function buildEmployeeSearchConditions(search: string): Prisma.EmployeeWhereInput[] {
  const term = search.trim();
  if (!term) return [];

  const parts = term.split(/\s+/).filter(Boolean);

  const conditions: Prisma.EmployeeWhereInput[] = [
    { firstName: { contains: term, mode: 'insensitive' } },
    { lastName: { contains: term, mode: 'insensitive' } },
    { employeeId: { contains: term, mode: 'insensitive' } },
    { email: { contains: term, mode: 'insensitive' } },
    { department: { contains: term, mode: 'insensitive' } },
    { designation: { contains: term, mode: 'insensitive' } },
  ];

  if (parts.length > 1) {
    const firstWord = parts[0];
    const restWords = parts.slice(1).join(' ');
    conditions.push({
      AND: [
        { firstName: { contains: firstWord, mode: 'insensitive' } },
        { lastName: { contains: restWords, mode: 'insensitive' } },
      ],
    });
    conditions.push({
      AND: [
        { firstName: { contains: restWords, mode: 'insensitive' } },
        { lastName: { contains: firstWord, mode: 'insensitive' } },
      ],
    });
  }

  return conditions;
}
