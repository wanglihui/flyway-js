drop table if exists  table_name ;

-- 如果建表失败，整个sql脚本要停下来，支持重跑
create table table_name
(
    c1 int not null,
    column_2 int null,
    column_3 varchar(23) null,
    primary key (c1)
);

INSERT INTO table_name (c1, column_2, column_3)
values (0, 2, '123');


