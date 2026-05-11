
ALTER TABLE public.veiculos ADD CONSTRAINT veiculos_filial_fk FOREIGN KEY (filial_id) REFERENCES public.filiais(id) ON DELETE CASCADE;
ALTER TABLE public.motoristas ADD CONSTRAINT motoristas_filial_fk FOREIGN KEY (filial_id) REFERENCES public.filiais(id) ON DELETE CASCADE;

ALTER TABLE public.abastecimentos
  ADD CONSTRAINT abastec_filial_fk FOREIGN KEY (filial_id) REFERENCES public.filiais(id) ON DELETE CASCADE,
  ADD CONSTRAINT abastec_veiculo_fk FOREIGN KEY (veiculo_id) REFERENCES public.veiculos(id) ON DELETE CASCADE,
  ADD CONSTRAINT abastec_motorista_fk FOREIGN KEY (motorista_id) REFERENCES public.motoristas(id) ON DELETE SET NULL;

ALTER TABLE public.manutencoes
  ADD CONSTRAINT manut_filial_fk FOREIGN KEY (filial_id) REFERENCES public.filiais(id) ON DELETE CASCADE,
  ADD CONSTRAINT manut_veiculo_fk FOREIGN KEY (veiculo_id) REFERENCES public.veiculos(id) ON DELETE CASCADE;

ALTER TABLE public.pneus
  ADD CONSTRAINT pneus_filial_fk FOREIGN KEY (filial_id) REFERENCES public.filiais(id) ON DELETE CASCADE,
  ADD CONSTRAINT pneus_veiculo_fk FOREIGN KEY (veiculo_id) REFERENCES public.veiculos(id) ON DELETE SET NULL;

ALTER TABLE public.rodizios_pneus
  ADD CONSTRAINT rod_filial_fk FOREIGN KEY (filial_id) REFERENCES public.filiais(id) ON DELETE CASCADE,
  ADD CONSTRAINT rod_pneu_fk FOREIGN KEY (pneu_id) REFERENCES public.pneus(id) ON DELETE CASCADE,
  ADD CONSTRAINT rod_veiculo_fk FOREIGN KEY (veiculo_id) REFERENCES public.veiculos(id) ON DELETE SET NULL;

ALTER TABLE public.checklists
  ADD CONSTRAINT check_filial_fk FOREIGN KEY (filial_id) REFERENCES public.filiais(id) ON DELETE CASCADE,
  ADD CONSTRAINT check_veiculo_fk FOREIGN KEY (veiculo_id) REFERENCES public.veiculos(id) ON DELETE CASCADE,
  ADD CONSTRAINT check_motorista_fk FOREIGN KEY (motorista_id) REFERENCES public.motoristas(id) ON DELETE SET NULL;
