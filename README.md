
# pojoe
>this is the main Pojoe (formerly Pojo Engine) library use it to develop pluggable Pojoe steps, 
 this librarary provides some simple but useful steps (see below)
# install

>`npm install mbenzekri/pojoe`

# included steps 
>- [PojoProducer](#pojoproducer-output-a-pojo) : output a pojo
>- [PojoFilter](#pojofilter-filter-pojos) : filter pojos
>- [PojoLogger](#pojologger-logs-pojos) : Logs pojos
>- [PojoAttrSelector](#pojoattrselector-alter-property-names-in-pojos) : alter property names in pojos
# PojoProducer output a pojo
>

## goal

>this step emit one pojo provided in a parameter object literal expression

---
## parameters
> **pojos** *{json}* -- a json object or array literal  -- default = `[ { "num" : 1 },{ "num" : 2 },{ "num" : 3 } ]`
> 

## outputs
>- **pojos** -- the pojos outputed 


---

# PojoFilter filter pojos
>

## goal

> filter each inputed pojo through a boolean expression

---
## parameters
> **test** *{boolean}* -- filter expression  -- default = `true`
> 
## inputs
>- **pojos** -- pojo to filter 

## outputs
>- **success** -- filtered pojos 
>- **failure** -- filtered pojos 


---

# PojoLogger Logs pojos
>

## goal

> logs each inputed pojo through console

---
## parameters
> **expression** *{string}* -- expression to log  -- default = `${JSON.stringify(pojo)}`
> 
## inputs
>- **pojos** -- pojo to log 



---

# PojoAttrSelector alter property names in pojos
>

## goal

>rename, copy, remove keep attribute in pojos

---
## parameters
> **rename** *{string[]}* -- list of attributes to rename: old1,new1,old2,new2, ...  -- default = ``
> 
> **copy** *{string[]}* -- list of attributes to copy: from1,to1,from2,to2, ...  -- default = ``
> 
> **remove** *{string[]}* -- list of attributes to remove  -- default = ``
> 
> **keep** *{string[]}* -- list of attributes to keep  -- default = ``
> 
## inputs
>- **pojos** -- pojo to transform 

## outputs
>- **pojos** -- altered pojos 


---

---
