
CREATE OR REPLACE FUNCTION public.bootstrap_filial(_nome text, _cidade text DEFAULT NULL, _estado text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _existing uuid;
  _new_filial uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT filial_id INTO _existing FROM public.profiles WHERE id = _uid;
  IF _existing IS NOT NULL THEN
    RAISE EXCEPTION 'user already has a filial';
  END IF;

  INSERT INTO public.filiais (nome, cidade, estado)
  VALUES (_nome, _cidade, _estado)
  RETURNING id INTO _new_filial;

  UPDATE public.profiles SET filial_id = _new_filial WHERE id = _uid;

  INSERT INTO public.user_roles (user_id, role, filial_id)
  VALUES (_uid, 'admin'::app_role, _new_filial)
  ON CONFLICT DO NOTHING;

  RETURN _new_filial;
END;
$$;
