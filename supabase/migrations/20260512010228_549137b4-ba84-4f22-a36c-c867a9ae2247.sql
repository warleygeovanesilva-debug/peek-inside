
ALTER TABLE public.ocorrencias
  ADD CONSTRAINT ocorrencias_veiculo_fk FOREIGN KEY (veiculo_id) REFERENCES public.veiculos(id) ON DELETE SET NULL,
  ADD CONSTRAINT ocorrencias_motorista_fk FOREIGN KEY (motorista_id) REFERENCES public.motoristas(id) ON DELETE SET NULL,
  ADD CONSTRAINT ocorrencias_filial_fk FOREIGN KEY (filial_id) REFERENCES public.filiais(id) ON DELETE CASCADE;
