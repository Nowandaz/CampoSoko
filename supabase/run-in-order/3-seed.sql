-- Campuses (edit email_domain to enforce institutional emails; leave null to allow any email)
insert into campuses (name, county, email_domain) values
  ('University of Nairobi', 'Nairobi', null),
  ('Kenyatta University', 'Kiambu', null),
  ('Moi University', 'Uasin Gishu', null)
on conflict (name) do nothing;

insert into categories (slug, name, applies_to, sort_order) values
  ('electronics', 'Electronics', 'goods', 1),
  ('books', 'Books', 'goods', 2),
  ('clothes', 'Clothes', 'goods', 3),
  ('furniture', 'Furniture', 'goods', 4),
  ('food', 'Food', 'goods', 5),
  ('services-design', 'Design', 'service', 6),
  ('services-video', 'Video', 'service', 7),
  ('services-writing', 'Writing', 'service', 8),
  ('tutoring', 'Tutoring', 'service', 9),
  ('other', 'Other', 'both', 10)
on conflict (slug) do nothing;
