import {z} from 'zod';

import {digitsOnly} from '@/features/master/companies/utils/format';

import {SUPPLIER_CATEGORIES, SUPPLIER_DOCUMENT_TYPES} from '../constants/enums';

const optionalString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return null;
    const trimmed = v.trim();
    return trimmed.length ? trimmed : null;
  });

const optionalUppercaseString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null) return null;
    const trimmed = v.trim();
    return trimmed.length ? trimmed.toUpperCase() : null;
  });

const phoneSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || !String(v).trim().length) return null;
    const digits = digitsOnly(String(v)).slice(0, 11);
    return digits.length ? digits : null;
  })
  .refine((v) => v === null || v.length === 10 || v.length === 11, 'Telefone inválido.');

const zipCodeSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || !String(v).trim().length) return null;
    const digits = digitsOnly(String(v)).slice(0, 8);
    return digits.length ? digits : null;
  })
  .refine((v) => v === null || v.length === 8, 'CEP inválido.');

export const supplierDocumentTypeSchema = z.enum(SUPPLIER_DOCUMENT_TYPES);
export const supplierCategorySchema = z.enum(SUPPLIER_CATEGORIES);

const documentSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === null || !String(v).trim().length) return null;
    return digitsOnly(String(v));
  });

const supplierBaseSchema = z
  .object({
    corporateName: z
      .string()
      .trim()
      .min(1, 'Informe a razão social / nome.')
      .transform((v) => v.toUpperCase()),
    tradeName: optionalUppercaseString,
    document: documentSchema,
    documentType: supplierDocumentTypeSchema.nullable().optional(),
    categories: z
      .array(supplierCategorySchema)
      .min(1, 'Selecione ao menos uma categoria.')
      .default(['outros']),
    phone: phoneSchema,
    email: z
      .union([z.string(), z.null()])
      .optional()
      .transform((v) => {
        if (v === undefined || v === null) return null;
        const trimmed = v.trim();
        return trimmed.length ? trimmed : null;
      })
      .refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail inválido.'),
    contactName: optionalUppercaseString,
    zipCode: zipCodeSchema,
    address: optionalUppercaseString,
    number: optionalUppercaseString,
    district: optionalUppercaseString,
    city: optionalUppercaseString,
    state: optionalUppercaseString,
    active: z.boolean().optional().default(true),
    notes: optionalString,
  })
  .superRefine((data, ctx) => {
    if (!data.document) return;
    const inferredType =
      data.documentType ??
      (data.document.length === 14
        ? 'cnpj'
        : data.document.length === 11
          ? 'cpf'
          : null);

    if (!inferredType) {
      ctx.addIssue({
        code: 'custom',
        message: 'Informe um CNPJ (14) ou CPF (11) válido.',
        path: ['document'],
      });
      return;
    }

    if (inferredType === 'cnpj' && data.document.length !== 14) {
      ctx.addIssue({code: 'custom', message: 'CNPJ inválido.', path: ['document']});
    }
    if (inferredType === 'cpf' && data.document.length !== 11) {
      ctx.addIssue({code: 'custom', message: 'CPF inválido.', path: ['document']});
    }
  })
  .transform((data) => {
    if (!data.document) return data;
    const documentType =
      data.documentType ??
      (data.document.length === 14
        ? ('cnpj' as const)
        : data.document.length === 11
          ? ('cpf' as const)
          : null);
    return {...data, documentType};
  });

export const createSupplierSchema = supplierBaseSchema;
export const updateSupplierSchema = supplierBaseSchema;

export const updateSupplierActiveSchema = z.object({
  active: z.boolean(),
});

/** Cadastro rápido inline (select + modal). */
export const quickCreateSupplierSchema = z.object({
  corporateName: z
    .string()
    .trim()
    .min(1, 'Informe o nome do fornecedor.')
    .transform((v) => v.toUpperCase()),
  tradeName: optionalUppercaseString,
  document: documentSchema,
  documentType: supplierDocumentTypeSchema.nullable().optional(),
  categories: z
    .array(supplierCategorySchema)
    .min(1, 'Selecione ao menos uma categoria.')
    .default(['outros']),
  phone: phoneSchema,
  email: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null) return null;
      const trimmed = v.trim();
      return trimmed.length ? trimmed : null;
    })
    .refine((v) => !v || z.string().email().safeParse(v).success, 'E-mail inválido.'),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type QuickCreateSupplierInput = z.infer<typeof quickCreateSupplierSchema>;
