-- A sticker is a 300pt canvas snapshotted at device scale (900px on a 3x
-- phone) with an alpha channel; as a PNG that can pass the bucket's
-- 2 MB cap, and the upload fails quietly, so crewmates see an initial.
-- Room for the biggest the canvas produces.
update storage.buckets set file_size_limit = 6291456 where id = 'avatars';
