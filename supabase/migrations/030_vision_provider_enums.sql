-- FleetControl — VI session module: vision provider ENUM types

create type public.provider_name as enum (
  'openai',
  'google',
  'azure',
  'aws',
  'anthropic',
  'custom'
);

comment on type public.provider_name is
  'Supported third-party vision AI providers for the VI session module';

create type public.kind as enum (
  'ocr',
  'image_analysis',
  'document_vision',
  'object_detection',
  'multimodal',
  'custom'
);

comment on type public.kind is
  'Vision capability kind handled by a provider configuration';
