
# pojoe
>this is the main Pojoe (formerly Pojo Engine) library use it to develop pluggable Pojoe steps, 
 this librarary provides some simple but useful steps (see below)
# install

>`npm install mbenzekri/pojoe`

# included steps 

<detail>

<summary>
PojoProducer : output a pojo
</summary>

# PojoProducer output a pojo

## goal

>this step emit one pojo provided in a parameter object literal expression

---
## parameters
> **pojo** *{json}* -- the pojo literal  -- default = `${JSON.stringify(params.pojo)}`
> 


## outputs
>- **pojo** -- the pojo 


---

</detail>
<detail>
<summary>
PojoFilter : filter pojos
</summary>
# PojoFilter filter pojos
>

## goal

> filter each inputed pojo with boolean expression

---
## parameters
> **test** *{boolean}* -- filter expression  -- default = `true`
> 

## inputs
>- **pojos** -- pojo to filter 

## outputs
>- **filtered** -- filtered pojos 


---

</detail>
<detail>
<summary>
PojoLogger : Logs pojos
</summary>
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

</detail>
---
